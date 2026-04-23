import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Feishu Helper
const getTenantAccessToken = async () => {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Missing FEISHU_APP_ID or FEISHU_APP_SECRET");
  }

  const response = await axios.post("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    app_id: appId,
    app_secret: appSecret,
  });

  return response.data.tenant_access_token;
};

// Feishu Drive Upload Helper
const uploadImageToFeishu = async (base64Image: string, token: string, appToken: string) => {
  try {
    if (!base64Image) throw new Error("图片数据为空");

    // Remove Base64 prefix safely
    let base64Data = base64Image;
    if (base64Image.includes(',')) {
      base64Data = base64Image.split(',')[1];
    }
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log(`[Feishu] 准备上传图片，Buffer 长度: ${buffer.length}`);

    const form = new FormData();
    form.append('file_name', `onion_share_${Date.now()}.png`);
    form.append('parent_type', 'bitable_file');
    form.append('parent_node', appToken.trim());
    form.append('size', buffer.length.toString());
    form.append('file', buffer, { filename: 'screenshot.png', contentType: 'image/png' });

    const response = await axios.post(
      "https://open.feishu.cn/open-apis/drive/v1/files/upload_all",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.code !== 0) {
      const driveErr = JSON.stringify(response.data);
      console.error("[Feishu Drive API Error]:", driveErr);
      throw new Error(`飞书云空间上传失败: ${response.data.msg} (代码: ${response.data.code})`);
    }

    return response.data.data.file_token;
  } catch (error: any) {
    const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error("[Feishu Upload Fatal]:", detail);
    throw new Error(detail);
  }
};

// API: Submit to Bitable
app.post("/api/submissions", async (req, res) => {
  try {
    const { onionId, time, image } = req.body;
    const token = await getTenantAccessToken();
    const appToken = process.env.FEISHU_APP_TOKEN;
    const tableId = process.env.FEISHU_TABLE_ID;

    if (!appToken || !tableId) {
      return res.status(500).json({ error: "环境变量配置不全：请检查 FEISHU_APP_TOKEN 和 FEISHU_TABLE_ID" });
    }

    console.log(`[Feishu] 1. 正在上传图片至飞书空间...`);
    const fileToken = await uploadImageToFeishu(image, token, appToken);
    console.log(`[Feishu] 图片上传成功, fileToken: ${fileToken}`);

    console.log(`[Feishu] 2. 正在创建多维表格记录: ${onionId}`);
    const response = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      {
        fields: {
          "洋葱ID": String(onionId),
          "提交时间": String(time),
          "分享截图": [
            {
              "file_token": fileToken
            }
          ],
          "审核状态": "待审核"
        },
      },
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8"
        },
      }
    );

    if (response.data.code !== 0) {
      const bitableErr = JSON.stringify(response.data);
      console.error("[Feishu Bitable API Error]:", bitableErr);
      return res.status(500).json({ 
        error: "多维表格写入失败", 
        detail: `错误消息: ${response.data.msg} (代码: ${response.data.code})`
      });
    }

    console.log("[Feishu] 记录创建成功:", JSON.stringify(response.data));
    res.json(response.data);
  } catch (error: any) {
    const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error("[Feishu Error] 操作失败:", errorDetail);
    res.status(500).json({ 
      error: "飞书同步过程中遇到内部障碍", 
      detail: errorDetail 
    });
  }
});

// API: Get Status from Bitable
app.get("/api/submissions/:onionId", async (req, res) => {
  try {
    const { onionId } = req.params;
    const trimmedId = onionId.trim();
    const token = await getTenantAccessToken();
    const appToken = process.env.FEISHU_APP_TOKEN;
    const tableId = process.env.FEISHU_TABLE_ID;

    if (!appToken || !tableId) {
      return res.status(500).json({ error: "Feishu Bitable not configured" });
    }

    console.log(`[Feishu] 正在拉取记录列表进行匹配... (目标 ID: ${trimmedId})`);

    // 拉取最近记录，不再在 URL 里拼复杂的 filter 表达式，避免编码问题
    const response = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
      {
        params: {
          page_size: 100, // 拉取最近 100 条确保覆盖该用户
        },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const allItems = response.data?.data?.items || [];
    
    // 在服务器端手动过滤：这样最稳，不受飞书查询语法限制
    const filteredItems = allItems.filter((item: any) => {
      const recordId = String(item.fields["洋葱ID"] || "").trim();
      return recordId === trimmedId;
    });

    console.log(`[Feishu] 匹配完成，找到记录数: ${filteredItems.length}`);

    // 按提交时间降序排列
    const sortedItems = filteredItems.sort((a: any, b: any) => {
      const timeA = a.fields["提交时间"] || "";
      const timeB = b.fields["提交时间"] || "";
      return timeB.localeCompare(timeA);
    });

    const records = sortedItems.map((item: any) => {
      // 更加精准的附件 URL 抓取逻辑
      const shareImage = item.fields["分享截图"];
      let imageUrl = "";
      
      if (Array.isArray(shareImage) && shareImage.length > 0) {
        // 优先使用 tmp_url，这对于外部预览更友好
        imageUrl = shareImage[0].tmp_url || shareImage[0].url || "";
      } else if (typeof shareImage === 'string') {
        imageUrl = shareImage;
      }

      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        console.warn(`[Feishu] 发现异常图片路径格式: ${imageUrl.substring(0, 50)}...`);
      }

      return {
        id: item.record_id,
        onionId: item.fields["洋葱ID"],
        time: item.fields["提交时间"],
        count: Number(item.fields["分享张数"] || 1),
        status: item.fields["审核状态"] === "已通过" ? "passed" : item.fields["审核状态"] === "未通过" ? "failed" : "pending",
        image: imageUrl,
        reason: item.fields["拦截原因"] || ""
      };
    });

    res.json(records);
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    console.error("[Feishu Fetch Error]:", errorDetail);
    res.status(500).json({ 
      error: "拉取飞书记录失败", 
      detail: errorDetail 
    });
  }
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

export async function onRequestPost(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recordIds } = await request.json();

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return new Response(JSON.stringify({ statuses: {} }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 1. 获取 Feishu Token
    const authRes = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: env.FEISHU_APP_ID,
        app_secret: env.FEISHU_APP_SECRET,
      }),
    });
    
    const authData = await authRes.json();
    if (authData.code !== 0) throw new Error("飞书鉴权失败");
    const accessToken = authData.tenant_access_token;

    // 2. 批量查询记录 (飞书限制单次查询数量，我们假设10个记录没问题)
    const queryParams = new URLSearchParams();
    recordIds.forEach(id => queryParams.append('record_ids', id));

    const recordRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${env.FEISHU_BITABLE_APP_TOKEN}/tables/${env.FEISHU_BITABLE_TABLE_ID}/records?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const recordData = await recordRes.json();
    if (recordData.code !== 0) throw new Error(`查询记录失败: ${recordData.msg}`);

    // 3. 解析结果
    const results = {};
    recordData.data.items.forEach(item => {
      const fields = item.fields;
      
      // 处理评语字段 (飞书多行文本可能返回数组或对象)
      let feedbackText = fields["运营评语"] || "";
      if (Array.isArray(feedbackText)) {
        feedbackText = feedbackText.map(t => t.text || t.text_content || "").join("");
      } else if (typeof feedbackText === 'object') {
        feedbackText = feedbackText.text || JSON.stringify(feedbackText);
      }

      results[item.record_id] = {
        status: fields["审核状态"] || "待核验",
        feedback: feedbackText
      };
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
}

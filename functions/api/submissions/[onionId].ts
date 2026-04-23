export async function onRequestGet(context) {
  const { env, params } = context;
  const { onionId } = params;
  const trimmedId = onionId.trim();

  try {
    // Get Tenant Access Token
    const authRes = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: env.FEISHU_APP_ID,
        app_secret: env.FEISHU_APP_SECRET,
      }),
    });
    
    const authData = await authRes.json();
    if (authData.code !== 0) {
      return new Response(JSON.stringify({ error: "Feishu Auth Failed" }), { status: 500 });
    }
    const token = authData.tenant_access_token;

    // Fetch Records
    const res = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${env.FEISHU_TABLE_ID}/records?page_size=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    const allItems = data?.data?.items || [];
    
    const filteredItems = allItems.filter((item) => {
      const recordId = String(item.fields["洋葱ID"] || "").trim();
      return recordId === trimmedId;
    });

    const sortedItems = filteredItems.sort((a, b) => {
      const timeA = a.fields["提交时间"] || "";
      const timeB = b.fields["提交时间"] || "";
      return timeB.localeCompare(timeA);
    });

    const records = sortedItems.map((item) => {
      const shareImage = item.fields["分享截图"];
      let imageUrl = "";
      
      if (Array.isArray(shareImage) && shareImage.length > 0) {
        imageUrl = shareImage[0].tmp_url || shareImage[0].url || "";
      } else if (typeof shareImage === 'string') {
        imageUrl = shareImage;
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

    return new Response(JSON.stringify(records), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { onionId, time, image } = await request.json();
    
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
      return new Response(JSON.stringify({ error: "Feishu Auth Failed", detail: authData.msg }), { status: 500 });
    }
    const token = authData.tenant_access_token;

    // Upload Image helper
    let base64Data = image;
    if (image.includes(',')) {
      base64Data = image.split(',')[1];
    }
    
    // Cloudflare Workers handle base64 to blob/file
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: "image/png" });
    
    const formData = new FormData();
    formData.append('file_name', `onion_share_${Date.now()}.png`);
    formData.append('parent_type', 'bitable_file');
    formData.append('parent_node', env.FEISHU_APP_TOKEN.trim());
    formData.append('size', blob.size.toString());
    formData.append('file', blob, 'screenshot.png');

    const uploadRes = await fetch("https://open.feishu.cn/open-apis/drive/v1/files/upload_all", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    if (uploadData.code !== 0) {
      return new Response(JSON.stringify({ error: "Feishu Upload Failed", detail: uploadData.msg }), { status: 500 });
    }
    const fileToken = uploadData.data.file_token;

    // Create Record
    const recordRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${env.FEISHU_APP_TOKEN}/tables/${env.FEISHU_TABLE_ID}/records`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
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
      }),
    });

    const recordData = await recordRes.json();
    return new Response(JSON.stringify(recordData), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

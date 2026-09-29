export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'include', ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error('ติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่าเปิด server แล้ว');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('session-expired'));
    const error = new Error(data.message || 'เรียกข้อมูลไม่สำเร็จ');
    error.status = response.status;
    throw error;
  }
  return data;
}
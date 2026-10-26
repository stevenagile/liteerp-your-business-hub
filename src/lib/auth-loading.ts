// Bound authentication reads without discarding a potentially valid session.
export function withAuthTimeout<T>(request: PromiseLike<T>, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("登入資料讀取逾時，請重試。")), timeoutMs);
    Promise.resolve(request).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}
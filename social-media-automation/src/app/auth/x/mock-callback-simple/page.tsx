'use client';

export default function SimpleMockCallback() {
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const state = searchParams.get('state');
  const code = searchParams.get('code');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-green-600 mb-2">
          模拟授权成功
        </h1>
        
        <p className="text-gray-600 mb-4">
          开发环境模拟授权成功！
        </p>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-700 text-sm">
            ✅ 开发环境模拟授权成功
          </p>
          <p className="text-green-600 text-xs mt-1">
            State: {state?.substring(0, 8)}...
          </p>
          <p className="text-green-600 text-xs mt-1">
            Code: {code?.substring(0, 20)}...
          </p>
        </div>
        
        <button
          onClick={() => window.close()}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          关闭窗口
        </button>
      </div>
    </div>
  );
}
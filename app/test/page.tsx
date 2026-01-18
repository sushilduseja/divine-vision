export default function TestPage() {
  return (
    <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-2xl">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Tailwind Test
        </h1>
        <p className="text-xl text-green-600">
          If you see colors, Tailwind is working!
        </p>
        <div className="mt-4 space-y-2">
          <div className="h-10 bg-purple-600 rounded"></div>
          <div className="h-10 bg-pink-600 rounded"></div>
          <div className="h-10 bg-indigo-600 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function LoadingMyCourses() {
  return (
    <main className="mx-auto max-w-5xl p-6" aria-busy="true">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid gap-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded border bg-slate-100" />)}
      </div>
    </main>
  );
}

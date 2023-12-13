export function Toolbar() {
  return (
    <header className="sticky top-0 z-50 flex w-full flex-col items-stretch border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col items-stretch px-6 py-4">
        <div className="flex flex-row items-center justify-center gap-8 whitespace-nowrap">
          <h1 className="flex flex-col justify-center text-xl">
            HR Administration System
          </h1>
          <div className="grow" />
        </div>
      </div>
    </header>
  );
}

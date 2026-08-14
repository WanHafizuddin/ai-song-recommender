export default function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-panel/40 px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-5 w-fit items-end gap-[3px] opacity-40" aria-hidden="true">
        <span className="h-2 w-[3px] rounded-sm bg-haze" />
        <span className="h-4 w-[3px] rounded-sm bg-haze" />
        <span className="h-1.5 w-[3px] rounded-sm bg-haze" />
        <span className="h-3 w-[3px] rounded-sm bg-haze" />
      </div>
      <p className="text-sm text-haze">{message}</p>
    </div>
  );
}

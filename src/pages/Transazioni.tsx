const Transazioni = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transazioni</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestisci le tue entrate e uscite
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">
          La lista delle transazioni apparirà qui
        </p>
      </div>
    </div>
  );
};

export default Transazioni;

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Panoramica delle tue finanze personali
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Saldo attuale", value: "—" },
          { label: "Entrate (mese)", value: "—" },
          { label: "Uscite (mese)", value: "—" },
          { label: "Risparmio", value: "—" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card p-5 space-y-1"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {kpi.label}
            </p>
            <p className="text-2xl font-semibold font-mono">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-6 h-64 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          I grafici appariranno qui
        </p>
      </div>
    </div>
  );
};

export default Dashboard;

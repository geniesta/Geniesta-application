import { Card, CardContent } from "@/components/ui/card";

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 py-3">
      <CardContent className="py-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {/* K140 数値は等幅で桁を揃える（指標グリッドの視覚的整列）。 */}
        <div className="text-xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

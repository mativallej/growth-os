"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export type InventarioRow = {
  title: string;
  slug: string;
  canal: string;
  formula: string;
  estado: string;
  snaps: number;
  search: string;
};

const isPub = (e: string) => e.toLowerCase().includes("public");
const btnBase = "rounded-md border border-border px-3 py-1.5 text-xs transition-colors";

export default function InventarioClient({ rows, nets }: { rows: InventarioRow[]; nets: string[] }) {
  const [term, setTerm] = useState("");
  const [net, setNet] = useState("");

  const filtered = rows.filter(
    (r) => r.search.includes(term.toLowerCase()) && (!net || r.canal === net)
  );

  const filters = [{ label: "Todas", value: "" }, ...nets.map((n) => ({ label: n, value: n }))];

  return (
    <>
      <div className="mb-3 max-w-[320px]">
        <Input
          placeholder="Buscar pieza, canal, fórmula…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((b) => (
          <button
            key={b.value}
            onClick={() => setNet(b.value)}
            className={`${btnBase} ${
              net === b.value ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pieza</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Fórmula</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Snaps</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.slug}>
                  <TableCell className="font-medium">
                    <Link href={`/piezas/${r.slug}`} className="hover:text-primary hover:underline">
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.canal || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.formula || "—"}</TableCell>
                  <TableCell>
                    {isPub(r.estado) ? (
                      <Badge variant="success">Publicado</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.estado || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{r.snaps || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

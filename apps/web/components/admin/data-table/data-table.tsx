"use client";

import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  title: string;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = "No data found",
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                    column.className
                  )}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={String(item[keyField])}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-accent/50"
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn("px-4 py-3 text-sm", column.className)}
                    >
                      {column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

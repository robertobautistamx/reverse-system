import React from 'react';

export type Column = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
};

type DataTableProps = {
  title: string;
  columns: Column[];
  rows: Array<Record<string, React.ReactNode>>;
  emptyMessage?: string;
};

export const DataTable = ({ title, columns, rows, emptyMessage }: DataTableProps) => {
  return (
    <section className="panel table-panel reveal">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>Ultimos registros normalizados por minuto.</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="loading">{emptyMessage || 'Sin datos disponibles.'}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} style={{ textAlign: column.align || 'left' }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`row-${index}`}>
                  {columns.map((column) => (
                    <td
                      key={`${column.key}-${index}`}
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

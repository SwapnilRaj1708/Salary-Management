import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TableCell, { type TableCellProps } from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import type { SortDirection } from '../../components/useSortedRows.ts';

/** One titled card per question the page answers. */
export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card variant="outlined" component="section" aria-label={title}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 2 }}
        >
          <div>
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </div>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export function SectionSkeleton({ height = 240 }: { height?: number }) {
  return <Skeleton variant="rounded" height={height} aria-label="Loading" />;
}

export function NoActiveEmployees({ where }: { where?: string }) {
  return (
    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
      No active employees{where ? ` in ${where}` : ''}
    </Typography>
  );
}

/** A table header cell that sorts its column. */
export function SortHeader<Key extends string>({
  label,
  column,
  sort,
  onSort,
  align,
}: {
  label: string;
  column: Key;
  sort: { key: Key; direction: SortDirection };
  onSort: (key: Key) => void;
  align?: TableCellProps['align'];
}) {
  const active = sort.key === column;
  return (
    <TableCell align={align} sortDirection={active ? sort.direction : false}>
      <TableSortLabel
        active={active}
        direction={active ? sort.direction : 'asc'}
        onClick={() => onSort(column)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

export const count = (n: number) => n.toLocaleString('en-US');

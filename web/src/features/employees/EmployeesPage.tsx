import SearchIcon from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
} from '@mui/x-data-grid';
import {
  COUNTRIES,
  COUNTRY_CODES,
  type EmployeeListItem,
  type EmployeeSort,
  type EmployeeSortField,
  formatMoney,
} from '@salary/shared';
import { getRouteApi } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useEmployees, useReferenceData } from '../../api/queries.ts';
import { useDelayedFlag } from '../../app/useDelayedFlag.ts';
import { DIRECTORY_DEFAULTS, type DirectorySearch } from './search.ts';

const route = getRouteApi('/signed-in/employees');

/** Waits this long after typing stops before searching (docs/design-system.md §4). */
export const SEARCH_DEBOUNCE_MS = 300;

/** Enough for the header, about five rows and the footer on a short screen. */
const GRID_MIN_HEIGHT = 400;

/** Grid column field → API sort key. Columns not listed here can't be sorted. */
const SORT_FIELDS: Partial<Record<string, EmployeeSortField>> = {
  fullName: 'name',
  country: 'country',
  department: 'department',
  jobTitle: 'jobTitle',
  hireDate: 'hireDate',
  salaryUsd: 'salaryUsd',
};

const usd = (amount: number) =>
  formatMoney({ amountMinor: Math.round(amount * 100), currency: 'USD' });

const COLUMNS: GridColDef<EmployeeListItem>[] = [
  {
    field: 'fullName',
    headerName: 'Employee',
    flex: 1.4,
    minWidth: 200,
    renderCell: ({ row }) => (
      <Stack sx={{ py: 0.5, lineHeight: 1.3 }}>
        <span>{row.fullName}</span>
        <Typography variant="caption" color="text.secondary">
          {row.employeeCode}
        </Typography>
      </Stack>
    ),
  },
  {
    field: 'country',
    headerName: 'Country',
    flex: 0.9,
    minWidth: 130,
    valueGetter: (_value, row) => COUNTRIES[row.country].name,
  },
  { field: 'department', headerName: 'Department', flex: 1, minWidth: 140 },
  { field: 'jobTitle', headerName: 'Job title', flex: 1.3, minWidth: 180 },
  { field: 'hireDate', headerName: 'Hired', width: 120 },
  {
    field: 'status',
    headerName: 'Status',
    width: 110,
    sortable: false,
    renderCell: ({ row }) =>
      row.status === 'left' ? (
        <Chip size="small" label={`Left ${row.leftOn}`} />
      ) : (
        <Chip size="small" color="success" variant="outlined" label="Active" />
      ),
  },
  {
    field: 'salary',
    headerName: 'Salary (local)',
    flex: 1,
    minWidth: 150,
    align: 'right',
    headerAlign: 'right',
    // Local amounts in different currencies can't be ordered meaningfully; sort by USD.
    sortable: false,
    valueGetter: (_value, row) => formatMoney(row.salary),
  },
  {
    field: 'salaryUsd',
    headerName: 'Salary (USD)',
    flex: 0.9,
    minWidth: 130,
    align: 'right',
    headerAlign: 'right',
    valueGetter: (_value, row) => usd(row.salaryUsd),
  },
];

function toSortModel(sort: EmployeeSort): GridSortModel {
  const descending = sort.startsWith('-');
  const key = descending ? sort.slice(1) : sort;
  const field = Object.entries(SORT_FIELDS).find(([, value]) => value === key)?.[0];
  return field ? [{ field, sort: descending ? 'desc' : 'asc' }] : [];
}

function fromSortModel(model: GridSortModel): EmployeeSort {
  const [first] = model;
  const key = first && SORT_FIELDS[first.field];
  if (!first || !key) return DIRECTORY_DEFAULTS.sort;
  return (first.sort === 'desc' ? `-${key}` : key) as EmployeeSort;
}

export function EmployeesPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const employees = useEmployees(search);
  const showProgress = useDelayedFlag(employees.isFetching, 200);
  // Stable model objects: the grid treats a new object as a change and would report a
  // "sort change" on every render, which resets the page to 1.
  const sortModel = useMemo(() => toSortModel(search.sort), [search.sort]);
  const paginationModel = useMemo(
    () => ({ page: search.page - 1, pageSize: search.pageSize }),
    [search.page, search.pageSize],
  );

  // Filter changes start again at page 1; paging and sorting keep the rest.
  const setFilters = (changes: Partial<DirectorySearch>, resetPage = true) =>
    navigate({ search: (prev) => ({ ...prev, ...changes, ...(resetPage ? { page: 1 } : {}) }) });

  const clearFilters = () => navigate({ search: {} });
  const hasFilters = Boolean(
    search.q ||
      search.country ||
      search.departmentId ||
      search.jobTitleId ||
      search.status !== 'active',
  );

  return (
    <Stack spacing={2} sx={{ flex: 1 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { sm: 'baseline' }, justifyContent: 'space-between' }}
      >
        <Typography variant="h4" component="h1">
          Employees
        </Typography>
        {employees.data && (
          <Typography variant="body2" color="text.secondary">
            {employees.data.total.toLocaleString('en-US')} employees · USD at static rates as of{' '}
            {employees.data.fx.asOf}
          </Typography>
        )}
      </Stack>

      <DirectoryFilters
        search={search}
        onChange={setFilters}
        onClear={clearFilters}
        canClear={hasFilters}
      />

      {employees.isError && (
        <Alert severity="error">The employee list could not be loaded. Please try again.</Alert>
      )}

      {/* The grid takes the height left in the viewport; below the minimum the page scrolls. */}
      <Box
        aria-busy={employees.isFetching}
        sx={{ flex: '1 1 0', minHeight: GRID_MIN_HEIGHT, width: '100%' }}
      >
        <DataGrid
          rows={employees.data?.items ?? []}
          columns={COLUMNS}
          rowCount={employees.data?.total ?? 0}
          loading={showProgress || employees.isPending}
          paginationMode="server"
          sortingMode="server"
          disableColumnFilter
          disableVirtualization // a page is at most 100 rows, and every row is then in the DOM
          rowHeight={52} // two lines: the name and the employee code
          pageSizeOptions={[25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={(model: GridPaginationModel) =>
            setFilters({ page: model.page + 1, pageSize: model.pageSize }, false)
          }
          sortModel={sortModel}
          onSortModelChange={(model) => {
            const sort = fromSortModel(model);
            if (sort !== search.sort) void setFilters({ sort });
          }}
          slots={{
            noRowsOverlay: () => <NoRows onClear={hasFilters ? clearFilters : undefined} />,
          }}
          slotProps={{ loadingOverlay: { variant: 'linear-progress', noRowsVariant: 'skeleton' } }}
        />
      </Box>
    </Stack>
  );
}

function NoRows({ onClear }: { onClear: (() => void) | undefined }) {
  return (
    <Stack spacing={1} sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="text.secondary">No employees match these filters</Typography>
      {onClear && (
        <Button size="small" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </Stack>
  );
}

function DirectoryFilters({
  search,
  onChange,
  onClear,
  canClear,
}: {
  search: DirectorySearch;
  onChange: (changes: Partial<DirectorySearch>) => void;
  onClear: () => void;
  canClear: boolean;
}) {
  const reference = useReferenceData();
  const [text, setText] = useState(search.q ?? '');

  // Follow the URL when it changes from outside, such as Clear filters or Back.
  useEffect(() => setText(search.q ?? ''), [search.q]);

  useEffect(() => {
    if (text.trim() === (search.q ?? '')) return;
    const timer = setTimeout(() => onChange({ q: text.trim() || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, search.q, onChange]);

  const jobTitles = reference.data?.jobTitles ?? [];

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { md: 'center' } }}
    >
      <TextField
        label="Search"
        placeholder="Name, email or EMP code"
        value={text}
        onChange={(event) => setText(event.target.value)}
        sx={{ minWidth: 240 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        select
        label="Country"
        value={search.country ?? ''}
        onChange={(event) =>
          onChange({ country: (event.target.value || undefined) as DirectorySearch['country'] })
        }
        sx={{ minWidth: 160 }}
      >
        <MenuItem value="">All countries</MenuItem>
        {[...COUNTRY_CODES]
          .sort((a, b) => COUNTRIES[a].name.localeCompare(COUNTRIES[b].name))
          .map((code) => (
            <MenuItem key={code} value={code}>
              {COUNTRIES[code].name}
            </MenuItem>
          ))}
      </TextField>
      <TextField
        select
        label="Department"
        value={search.departmentId ?? ''}
        onChange={(event) =>
          onChange({ departmentId: event.target.value ? Number(event.target.value) : undefined })
        }
        sx={{ minWidth: 170 }}
      >
        <MenuItem value="">All departments</MenuItem>
        {(reference.data?.departments ?? []).map((department) => (
          <MenuItem key={department.id} value={department.id}>
            {department.name}
          </MenuItem>
        ))}
      </TextField>
      <Autocomplete
        options={jobTitles}
        getOptionLabel={(option) => option.name}
        value={jobTitles.find((title) => title.id === search.jobTitleId) ?? null}
        onChange={(_event, title) => onChange({ jobTitleId: title?.id })}
        renderInput={(params) => <TextField {...params} label="Job title" />}
        sx={{ minWidth: 230 }}
        size="small"
      />
      <TextField
        select
        label="Status"
        value={search.status}
        onChange={(event) => onChange({ status: event.target.value as DirectorySearch['status'] })}
        sx={{ minWidth: 130 }}
      >
        <MenuItem value="active">Active</MenuItem>
        <MenuItem value="left">Left</MenuItem>
        <MenuItem value="all">All</MenuItem>
      </TextField>
      {canClear && <Button onClick={onClear}>Clear filters</Button>}
    </Stack>
  );
}

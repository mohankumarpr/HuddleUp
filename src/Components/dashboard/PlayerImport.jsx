import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { subscribeToSports } from "../../utils/firebase/events";
import { subscribeToPlayerPrivate, subscribeToPlayers } from "../../utils/firebase/players";
import { buildImportRows, identityKey, importPlayers, parseCsvFile, templateCsv } from "../../utils/firebase/bulkImport";
import { downloadTextFile } from "../../utils/download";
import LoadingSpinner from "../LoadingSpinner";

const downloadTemplate = (sportNames) => downloadTextFile("players-template.csv", templateCsv(sportNames));

export default function PlayerImport() {
  const { eventId } = useParams();
  const [sports, setSports] = useState(null);
  const [players, setPlayers] = useState(null);
  const [privateById, setPrivateById] = useState(null);

  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null); // { rows, headers }
  const [defaultBasePrice, setDefaultBasePrice] = useState(100);
  const [createMissingSports, setCreateMissingSports] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubs = [
      subscribeToSports(eventId, setSports),
      subscribeToPlayers(eventId, setPlayers),
      subscribeToPlayerPrivate(eventId, setPrivateById),
    ];
    return () => unsubs.forEach((u) => u());
  }, [eventId]);

  const existingIdentity = useMemo(() => {
    const set = new Set();
    (players || []).forEach((p) => {
      const priv = privateById?.[p.id] || {};
      set.add(identityKey({ email: priv.email, name: p.name, contact: priv.contact }));
    });
    return set;
  }, [players, privateById]);

  const rows = useMemo(
    () =>
      parsed
        ? buildImportRows(parsed.rows, parsed.headers, {
            sports: sports || [],
            existingIdentity,
            defaultBasePrice: Number(defaultBasePrice) || 0,
          })
        : [],
    [parsed, sports, existingIdentity, defaultBasePrice]
  );

  const importable = rows.filter((r) => r.errors.length === 0);
  const withWarnings = importable.filter((r) => r.warnings.length > 0).length;
  const skipped = rows.length - importable.length;
  const unknownSportNames = [...new Set(rows.flatMap((r) => r.unknownSports))];

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const data = await parseCsvFile(file);
      if (!data.rows.length) {
        setError("That file has no data rows.");
        return;
      }
      setFileName(file.name);
      setParsed(data);
    } catch (err) {
      setError(`Couldn't read that file: ${err.message || err}`);
    }
  }

  async function handleImport() {
    setError(null);
    setProgress({ done: 0, total: importable.length });
    try {
      const done = await importPlayers(eventId, importable, {
        sports,
        createMissingSports,
        onProgress: (d, total) => setProgress({ done: d, total }),
      });
      setResult({ imported: done, skipped });
      setParsed(null);
      setFileName("");
    } catch (err) {
      setError(err.message || "The import failed part-way. Check the player pool before retrying to avoid duplicates.");
    } finally {
      setProgress(null);
    }
  }

  if (!sports || !players || !privateById) return <LoadingSpinner />;

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Bulk upload players
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload a CSV file to add many players at once. They go straight into the player pool (no approval step). Players
        with an email can log in to the event portal with it.
      </Typography>

      {result && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }} action={<Button component={RouterLink} to={`/app/events/${eventId}/players`}>View pool</Button>}>
          Imported {result.imported} player{result.imported === 1 ? "" : "s"}
          {result.skipped ? ` (${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped)` : ""}.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1" fontWeight={600}>
            1. Get the template
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Columns: <b>name</b> (required), email, contact, gender, block, about_me, <b>sports</b> (separate several with ;
            or ,), base_price, photo_url. Header names like "Player Name" or "Contact Number" are recognised too, and a
            column named after a sport with yes/1 in it also works. Using Excel? Save the sheet as CSV first.
          </Typography>
          <Box>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadTemplate(sports.map((s) => s.name))}>
              Download template
            </Button>
          </Box>

          <Typography variant="subtitle1" fontWeight={600} sx={{ pt: 1 }}>
            2. Upload your file
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
              Choose CSV file
              <input type="file" accept=".csv,text/csv" hidden onChange={handleFile} data-testid="csv-input" />
            </Button>
            {fileName && <Chip label={`${fileName} · ${parsed?.rows.length ?? 0} rows`} onDelete={() => { setParsed(null); setFileName(""); }} />}
            <TextField
              label="Default base price"
              type="number"
              size="small"
              value={defaultBasePrice}
              onChange={(e) => setDefaultBasePrice(e.target.value)}
              helperText="Used when a row has no base_price"
              sx={{ width: 190 }}
            />
          </Stack>
        </Stack>
      </Paper>

      {parsed && (
        <>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip color="success" label={`${importable.length} ready to import`} />
            {withWarnings > 0 && <Chip color="warning" variant="outlined" label={`${withWarnings} with warnings`} />}
            {skipped > 0 && <Chip color="error" variant="outlined" label={`${skipped} will be skipped`} />}
          </Stack>

          {unknownSportNames.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              These sports in your file aren't set up for this event: <b>{unknownSportNames.join(", ")}</b>.
              <FormControlLabel
                sx={{ display: "block" }}
                control={<Checkbox checked={createMissingSports} onChange={(e) => setCreateMissingSports(e.target.checked)} />}
                label="Create them automatically (you can add dates and rules later)"
              />
            </Alert>
          )}

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440, mb: 3 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Sports</TableCell>
                  <TableCell align="right">Base</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.rowNumber} sx={r.errors.length ? { bgcolor: "action.hover", opacity: 0.85 } : undefined}>
                    <TableCell>{r.rowNumber}</TableCell>
                    <TableCell>{r.data.name || "—"}</TableCell>
                    <TableCell>{r.data.email || "—"}</TableCell>
                    <TableCell>{r.data.contact || "—"}</TableCell>
                    <TableCell>
                      {r.data.sportIds.map((id) => sports.find((s) => s.id === id)?.name).filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell align="right">{r.data.basePrice}</TableCell>
                    <TableCell>
                      {r.errors.length > 0 ? (
                        <Typography variant="caption" color="error">
                          Skipped: {r.errors.join("; ")}
                        </Typography>
                      ) : r.warnings.length > 0 ? (
                        <Typography variant="caption" color="warning.main">
                          {r.warnings.join("; ")}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="success.main">
                          OK
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {progress && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={(progress.done / Math.max(progress.total, 1)) * 100} />
              <Typography variant="caption" color="text.secondary">
                Importing {progress.done} / {progress.total}
              </Typography>
            </Box>
          )}

          <Button variant="contained" size="large" disabled={!importable.length || Boolean(progress)} onClick={handleImport}>
            Import {importable.length} player{importable.length === 1 ? "" : "s"}
          </Button>
        </>
      )}
    </Box>
  );
}

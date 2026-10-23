import React, { useState } from "react";
import { MenuItem, Stack, TextField } from "@mui/material";

const UNIT_FACTOR = { crore: 10000000, lakh: 100000, rupees: 1 };

// Every real amount in this app is lakh/crore scale, so a plain rupee number field makes someone
// either count zeros or type a decimal (like "1.25" meaning "1.25 crore") that silently gets taken
// as 1.25 *rupees* and rounds down to a meaningless 1 or 2. This lets them type in whichever unit
// they're actually thinking in, decimals and all, and converts to/from plain rupees at the edges.
function unitForAmount(amount) {
  const abs = Math.abs(Number(amount) || 0);
  if (abs >= UNIT_FACTOR.crore) return "crore";
  if (abs >= UNIT_FACTOR.lakh) return "lakh";
  if (abs > 0) return "rupees"; // a genuinely sub-lakh amount -- show it as what it is, not "0.08 lakh"
  return "lakh"; // nothing entered yet: guess the unit most amounts in this app are entered in
}

function toUnitText(amount, unit) {
  const n = (Number(amount) || 0) / UNIT_FACTOR[unit];
  if (!n) return "";
  return (Math.round(n * 100) / 100).toString();
}

// `value`/`onChange` are always plain rupees -- this is purely a presentation layer around that,
// same contract as the raw TextField it replaces. Like the form fields elsewhere in this app that
// reset their local state from an `open`/record-identity effect (see EditPlayerDialog), mount this
// fresh (e.g. with a `key` tied to the record being edited) when the underlying value changes from
// somewhere other than this field itself; it doesn't watch `value` for external resets on its own.
export default function AmountField({ label, value, onChange, helperText, size = "medium", fullWidth = true, sx, required, autoFocus }) {
  const [unit, setUnit] = useState(() => unitForAmount(value));
  const [text, setText] = useState(() => toUnitText(value, unitForAmount(value)));

  function handleTextChange(nextText) {
    setText(nextText);
    const n = Number(nextText);
    onChange(Number.isFinite(n) ? Math.round(n * UNIT_FACTOR[unit]) : 0);
  }

  function handleUnitChange(nextUnit) {
    // Re-express the same rupee amount in the new unit -- switching units shouldn't feel like it
    // erased what was typed.
    const amount = Number(text) ? Math.round(Number(text) * UNIT_FACTOR[unit]) : 0;
    setUnit(nextUnit);
    setText(toUnitText(amount, nextUnit));
  }

  return (
    <Stack direction="row" spacing={1} sx={sx}>
      <TextField
        label={label}
        type="number"
        size={size}
        required={required}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        helperText={helperText}
        fullWidth={fullWidth}
      />
      <TextField
        select
        size={size}
        label="Unit"
        value={unit}
        onChange={(e) => handleUnitChange(e.target.value)}
        sx={{ minWidth: 110, flexShrink: 0 }}
      >
        <MenuItem value="crore">Crore</MenuItem>
        <MenuItem value="lakh">Lakh</MenuItem>
        <MenuItem value="rupees">Rupees</MenuItem>
      </TextField>
    </Stack>
  );
}

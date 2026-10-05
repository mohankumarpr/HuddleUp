import React, { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsIcon from "@mui/icons-material/Groups";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import PersonIcon from "@mui/icons-material/Person";
import { getTeamOwners } from "../../utils/firebase/events";
import { formatDateTime, participantsLabel } from "../../utils/format";
import StandingsTable from "./StandingsTable";

const GENDER_ICON = { male: <MaleIcon />, female: <FemaleIcon />, other: <PersonIcon /> };

// The "Standings / Teams / Sports & rules" tabs shared by the public event page and the logged-in
// player portal. `myTeamId` (optional) highlights the viewer's own team. `extraTab` (optional)
// prepends one more tab -- e.g. the player portal's "My details" -- so the caller doesn't have to
// duplicate this whole tab strip just to add one tab of its own.
export default function EventInfoTabs({ teams, sports, results, statsBySport, players = [], myTeamId, extraTab }) {
  const [tab, setTab] = useState(0);
  const offset = extraTab ? 1 : 0;

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }} variant="scrollable">
        {extraTab && <Tab label={extraTab.label} />}
        <Tab label="Standings" />
        <Tab label="Teams" />
        <Tab label="Sports & rules" />
      </Tabs>

      {extraTab && tab === 0 && extraTab.content}

      {tab === 0 + offset && (
        <StandingsTable teams={teams} results={results} sports={sports} statsBySport={statsBySport} showBreakdown />
      )}

      {tab === 1 + offset && (
        <Grid container spacing={2}>
          {teams.map((team) => {
            const owners = getTeamOwners(team);
            const roster = players.filter((p) => p.soldTeamId === team.id && p.status === "sold");
            return (
              <Grid item xs={12} sm={6} key={team.id}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: team.color }} />
                      <Typography fontWeight={700}>{team.name}</Typography>
                      {myTeamId === team.id && <Chip size="small" color="primary" label="Your team" />}
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                      {owners.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          No owners / captains added
                        </Typography>
                      )}
                      {owners.map((o) => (
                        <Chip key={o.id} size="small" icon={GENDER_ICON[o.gender] || <PersonIcon />} label={`${o.name} (captain)`} />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "text.secondary", mb: 0.5 }}>
                      <GroupsIcon fontSize="small" />
                      <Typography variant="body2">{roster.length} players</Typography>
                    </Stack>
                    {roster.map((p) => (
                      <Typography key={p.id} variant="body2">
                        {p.name}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {teams.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary">No teams yet.</Typography>
            </Grid>
          )}
        </Grid>
      )}

      {tab === 2 + offset && (
        <Box>
          {sports.length === 0 && <Typography color="text.secondary">No sports yet.</Typography>}
          {sports.map((sport) => (
            <Accordion key={sport.id} variant="outlined" disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography fontWeight={700}>{sport.name}</Typography>
                  <Typography variant="body2" color={sport.date ? "primary.main" : "text.secondary"}>
                    {formatDateTime(sport.date) || "Date to be announced"}
                    {sport.venue ? ` · ${sport.venue}` : ""}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {participantsLabel(sport) && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <b>Participants:</b> {participantsLabel(sport)}
                  </Typography>
                )}
                {sport.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {sport.description}
                  </Typography>
                )}
                <Typography variant="subtitle2">Rules</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {sport.rules || "Rules will be shared soon."}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
}

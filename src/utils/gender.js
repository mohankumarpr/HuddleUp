import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import PersonIcon from "@mui/icons-material/Person";

// Shared colors/icons for telling men's and women's players apart at a glance across the player
// pool, the live auction card, and the on-the-block reveal -- kept in one place so they stay
// consistent everywhere a player's gender is shown.
export const GENDER_META = {
  male: { label: "Male", color: "#3B82F6", Icon: MaleIcon },
  female: { label: "Female", color: "#EC4899", Icon: FemaleIcon },
  other: { label: "Other", color: "#9CA3AF", Icon: PersonIcon },
};

export function genderMeta(gender) {
  return GENDER_META[gender] || null;
}

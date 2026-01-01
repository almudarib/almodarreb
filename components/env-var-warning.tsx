import { Chip } from "@mui/material";
import { Button } from "./ui/button";

export function EnvVarWarning() {
  return (
    <div className="flex gap-4 items-center">
      <Chip variant="outlined" label="Supabase environment variables required" className="font-normal" />
      <div className="flex gap-2">
        <Button size="small" variant="outlined" disabled>
          Sign in
        </Button>
        <Button size="small" variant="contained" disabled>
          Sign up
        </Button>
      </div>
    </div>
  );
}

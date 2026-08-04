import { SvgIcon, SvgIconProps } from "@mui/material";

/**
 * Icon for the "Above" tag style in the annotation view.
 * Custom icon designed by Julia Pawlowski (see https://github.com/uhh-lt/dats/issues/675).
 */
export function TagStyleAboveIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      {/* "T" (scaled down to ~80% around center x=12) */}
      <polygon points="8.1 10.5 8.1 12.02 11.12 12.02 11.12 20.77 12.78 20.77 12.78 12.02 15.9 12.02 15.9 10.5 8.1 10.5" />
      {/* pill with circle cut out (enlarged) */}
      <path
        fillRule="evenodd"
        d="M3.9,1.5c-1.74,0-3.15,1.66-3.15,3.7s1.41,3.7,3.15,3.7h16.2c1.74,0,3.15-1.66,3.15-3.7s-1.41-3.7-3.15-3.7H3.9Zm0.85,6.14c-1.11,0-2-1.1-2-2.44s0.89-2.44,2-2.44,2,1.1,2,2.44-0.89,2.44-2,2.44"
      />
    </SvgIcon>
  );
}

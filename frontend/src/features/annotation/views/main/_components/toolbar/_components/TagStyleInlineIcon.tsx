import { SvgIcon, SvgIconProps } from "@mui/material";

/**
 * Icon for the "Inline" tag style in the annotation view.
 * Custom icon designed by Julia Pawlowski (see https://github.com/uhh-lt/dats/issues/675).
 */
export function TagStyleInlineIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      {/* rounded square with "T" and circle cut out */}
      <path
        fillRule="evenodd"
        d="M4.21,2.76h15.57c2.28,0,4.12,1.85,4.12,4.12v10.97c0,2.28-1.85,4.12-4.12,4.12H4.21C1.94,21.98.09,20.13.09,17.86V6.88C.09,4.61,1.94,2.76,4.21,2.76ZM16.07,16.77V9.28h2.67V7.97h-6.69v1.31h2.59v7.49h1.43ZM7.04,15.6c1.5,0,2.72-1.23,2.72-2.75s-1.22-2.75-2.72-2.75-2.72,1.23-2.72,2.75,1.22,2.75,2.72,2.75"
      />
    </SvgIcon>
  );
}

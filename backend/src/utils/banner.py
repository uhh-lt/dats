def print_dats_banner():
    # ANSI Color Codes matching your logo's exact palette
    C_GREEN = "\033[38;2;139;195;74m"  # Center
    C_YELLOW = "\033[38;2;253;216;53m"  # Top Center
    C_PINK = "\033[38;2;233;30;99m"  # Top Right
    C_DBLUE = "\033[38;2;21;101;192m"  # Mid Right
    C_LBLUE = "\033[38;2;66;165;245m"  # Bottom Center
    C_ORANGE = "\033[38;2;245;124;0m"  # Bottom Left
    C_BLACK = (
        "\033[38;2;140;140;140m"  # Top Left (Lightened slightly for dark terminals)
    )
    RESET = "\033[0m"
    BOLD = "\033[1m"

    # Spatially mapped to the exact relative positions of the original image
    # Logo is shifted down 1 line to perfectly center alongside the 6-line text
    banner = f"""
              {BOLD}██████╗  █████╗ ████████╗███████╗{RESET}
      {C_YELLOW}●{RESET}       {BOLD}██╔══██╗██╔══██╗╚══██╔══╝██╔════╝{RESET}
    {C_BLACK}●{RESET}   {C_PINK}●{RESET}     {BOLD}██║  ██║███████║   ██║   ███████╗{RESET}
      {BOLD}{C_GREEN}●{RESET}  {C_DBLUE}●{RESET}    {BOLD}██║  ██║██╔══██║   ██║   ╚════██║{RESET}
    {C_ORANGE}●{RESET}  {C_LBLUE}●{RESET}      {BOLD}██████╔╝██║  ██║   ██║   ███████║{RESET}
              {BOLD}╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝{RESET}
    """

    print(banner)

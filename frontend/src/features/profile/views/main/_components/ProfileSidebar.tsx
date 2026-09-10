import { getIconComponent, Icon } from "@components/icons";
import { UserAvatar } from "@core/user";
import { UserRead } from "@models/UserRead";
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { memo } from "react";
import { ProfileSection } from "../ProfileSection";

interface ProfileSidebarProps {
  user: UserRead;
  section: ProfileSection;
  onSectionChange: (section: ProfileSection) => void;
}

interface ProfileMenuItem {
  section: ProfileSection;
  label: string;
  icon: Icon;
}

const accountItems: ProfileMenuItem[] = [
  { section: "home", label: "Profile", icon: Icon.USER },
  { section: "email", label: "Email", icon: Icon.MEMO_ALT },
  { section: "password", label: "Password", icon: Icon.SETTINGS },
  { section: "apiKeys", label: "API Keys", icon: Icon.KEY },
];

const aboutItems: ProfileMenuItem[] = [
  { section: "dataPrivacy", label: "Data and Privacy", icon: Icon.VISIBILITY },
  { section: "support", label: "Support", icon: Icon.INFO },
];

export const ProfileSidebar = memo(({ user, section, onSectionChange }: ProfileSidebarProps) => {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Stack sx={{ py: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 2, py: 2 }}>
            <UserAvatar user={user} sx={{ width: 56, height: 56 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {user.first_name} {user.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                Your personal account
              </Typography>
            </Box>
          </Stack>
          <Typography variant="overline" color="text.secondary" noWrap sx={{ px: 2, mt: 1 }}>
            Account
          </Typography>
          <ProfileMenuSection items={accountItems} section={section} onSectionChange={onSectionChange} />
          <Divider sx={{ mx: 1, my: 1 }} />
          <Typography variant="overline" color="text.secondary" noWrap sx={{ px: 2, mt: 1 }}>
            About
          </Typography>
          <ProfileMenuSection items={aboutItems} section={section} onSectionChange={onSectionChange} />
        </Stack>
      </Box>
    </Box>
  );
});

interface ProfileMenuSectionProps {
  items: ProfileMenuItem[];
  section: ProfileSection;
  onSectionChange: (section: ProfileSection) => void;
}

function ProfileMenuSection({ items, section, onSectionChange }: ProfileMenuSectionProps) {
  return (
    <List dense disablePadding>
      {items.map((item) => (
        <ListItem key={item.section} disablePadding>
          <ListItemButton dense selected={section === item.section} onClick={() => onSectionChange(item.section)}>
            <ListItemIcon sx={{ minWidth: 0, mr: 1 }}>{getIconComponent(item.icon)}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2", noWrap: true }} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

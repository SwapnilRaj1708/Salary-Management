import MuiLink, { type LinkProps } from '@mui/material/Link';
import { createLink, type LinkComponent } from '@tanstack/react-router';
import { forwardRef } from 'react';

const MuiLinkAnchor = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => (
  <MuiLink ref={ref} {...props} />
));
MuiLinkAnchor.displayName = 'MuiLinkAnchor';

const CreatedTextLink = createLink(MuiLinkAnchor);

/** An MUI Link that navigates with TanStack Router's type-checked links and params. */
export const TextLink: LinkComponent<typeof MuiLinkAnchor> = (props) => (
  <CreatedTextLink preload="intent" {...props} />
);

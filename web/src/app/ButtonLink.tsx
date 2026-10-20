import Button, { type ButtonProps } from '@mui/material/Button';
import { createLink, type LinkComponent } from '@tanstack/react-router';
import { forwardRef } from 'react';

const MuiButtonAnchor = forwardRef<HTMLAnchorElement, ButtonProps<'a'>>((props, ref) => (
  <Button ref={ref} component="a" {...props} />
));
MuiButtonAnchor.displayName = 'MuiButtonAnchor';

const CreatedButtonLink = createLink(MuiButtonAnchor);

/** An MUI Button that navigates with TanStack Router's type-checked links. */
export const ButtonLink: LinkComponent<typeof MuiButtonAnchor> = (props) => (
  <CreatedButtonLink preload="intent" {...props} />
);

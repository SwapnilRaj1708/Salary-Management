import GlobalStyles from '@mui/material/GlobalStyles';

/** Name of the view-transition group for page content; the app bar stays still. */
export const PAGE_CONTENT_TRANSITION = 'main-content';

/**
 * Global CSS for page transitions. Every view transition is invisible by default:
 * browsers that support View Transitions but not transition types make the router
 * transition *every* navigation, including filter changes. Only the 'page' type
 * animates, and only for users who haven't asked for reduced motion.
 */
export function ViewTransitionStyles() {
  return (
    <GlobalStyles
      styles={(theme) => ({
        '::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*)': {
          animation: 'none',
        },
        '@media (prefers-reduced-motion: no-preference)': {
          [`html:active-view-transition-type(page)::view-transition-old(${PAGE_CONTENT_TRANSITION})`]:
            {
              animation: `${theme.transitions.duration.shortest}ms ${theme.transitions.easing.emphasizedAccelerate} both page-out`,
            },
          [`html:active-view-transition-type(page)::view-transition-new(${PAGE_CONTENT_TRANSITION})`]:
            {
              animation: `${theme.transitions.duration.shorter}ms ${theme.transitions.easing.emphasizedDecelerate} both page-in`,
            },
        },
        '@keyframes page-out': { to: { opacity: 0 } },
        '@keyframes page-in': { from: { opacity: 0, transform: 'translateY(8px)' } },
      })}
    />
  );
}

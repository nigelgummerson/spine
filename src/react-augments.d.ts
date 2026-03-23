// Augment React's HTMLAttributes to allow `placeholder` on contentEditable divs.
// Browsers support this via CSS `[placeholder]:empty:before` selectors.
import 'react';

declare module 'react' {
    interface HTMLAttributes<T> {
        placeholder?: string;
    }
}

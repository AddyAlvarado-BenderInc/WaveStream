import mongoose from 'mongoose';

declare global {
    var mongoose: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    };
}

// Allow CSS imports
declare module '*.css' {
    const content: { [className: string]: string };
    export default content;
}

// Allow side-effect CSS imports (like react-toastify)
declare module '*.css' {
    const css: string;
    export = css;
}

export {};

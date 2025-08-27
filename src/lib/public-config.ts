

// This file contains configuration variables that are safe to be exposed to the client-side.
// It only reads environment variables prefixed with NEXT_PUBLIC_.

function getPublicEnvVar(key: string, required: boolean = true): string {
    const value = process.env[key];
     if (!value && required) {
        const errorMessage = `Missing required public environment variable: ${key}. Make sure it's prefixed with NEXT_PUBLIC_ in your .env file.`;
        // We only log an error here, as throwing would break the build process
        // where env vars might not be available yet.
        console.error(errorMessage);
    }
    return value || '';
}

export const publicConfig = {
    s3: {
        publicUrl: getPublicEnvVar('NEXT_PUBLIC_S3_PUBLIC_URL'),
    },
};

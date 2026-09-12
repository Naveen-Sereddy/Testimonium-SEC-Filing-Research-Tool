/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // pdfjs-dist dynamically imports its worker module at a computed path; Vercel's
  // file tracer can't see that statically, so it gets dropped from the deployed
  // function unless force-included here.
  outputFileTracingIncludes: {
    '/api/upload': ['./node_modules/dommatrix/**/*', './node_modules/pdf-parse/**/*', './node_modules/pdfjs-dist/**/*'],
    '/api/upload/complete': ['./node_modules/dommatrix/**/*', './node_modules/pdf-parse/**/*', './node_modules/pdfjs-dist/**/*'],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

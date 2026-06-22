FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_API_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_WS_URL=$VITE_API_WS_URL
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
# Template: o entrypoint do nginx faz envsubst de ${PORT} (e só das envs definidas,
# preservando as variáveis do nginx como $uri) ao iniciar. Railway injeta PORT.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV PORT=80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // ── Public Routes (ครอบด้วย PublicLayout — มี Navbar, Footer, Maintenance Guard) ──
  layout("routes/_public.jsx", [
    index("routes/_public.home.jsx"),
    route("properties", "routes/_public.properties.jsx"),
    route("properties/:slug", "routes/_public.properties.$slug.jsx"),
    route("p/:id", "routes/_public.p.$id.jsx"),
    route("share/:id", "routes/_public.share.$id.jsx"),
    route("contact", "routes/_public.contact.jsx"),
    route("loan-services", "routes/_public.loan-services.jsx"),
    route("post", "routes/_public.post.jsx"),
    route("favorites", "routes/_public.favorites.jsx"),
    route("blogs", "routes/_public.blogs.jsx"),
    route("blogs/:slug", "routes/_public.blogs.$slug.jsx"),
    route("b/:id", "routes/_public.b.$id.jsx"),
    route("login", "routes/_public.login.jsx"),
    route("profile", "routes/_public.profile.jsx"),
    route("profile-settings", "routes/_public.profile-settings.jsx"),
  ]),

  // ── Admin Routes (แยก layout ไม่ถูก maintenance block) ──
  ...prefix("sps-internal-admin", [
    route("login", "routes/_admin.login.jsx"),
    layout("routes/_admin.jsx", [
      index("routes/_admin.dashboard.jsx"),
      route("properties", "routes/_admin.properties.jsx"),
      route("properties/new", "routes/_admin.properties.new.jsx"),
      route("properties/edit/:id", "routes/_admin.properties.edit.$id.jsx"),
      route("hero-slides", "routes/_admin.hero-slides.jsx"),
      route("homepage-sections", "routes/_admin.homepage-sections.jsx"),
      route("popular-locations", "routes/_admin.popular-locations.jsx"),
      route("pending-properties", "routes/_admin.pending-properties.jsx"),
      route("users", "routes/_admin.users.jsx"),
      route("settings", "routes/_admin.settings.jsx"),
      route("my-properties", "routes/_admin.my-properties.jsx"),
      route("leads", "routes/_admin.leads.jsx"),
      route("loan-requests", "routes/_admin.loan-requests.jsx"),
      route("activities", "routes/_admin.activities.jsx"),
      route("blogs", "routes/_admin.blogs.jsx"),
    ]),
  ]),
];

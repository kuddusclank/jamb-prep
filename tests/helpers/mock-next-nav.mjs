export function useRouter() {
  return { push: () => {}, replace: () => {} };
}
export function usePathname() {
  return "/study";
}
export function useSearchParams() {
  return new URLSearchParams();
}

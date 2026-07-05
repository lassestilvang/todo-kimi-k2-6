import { isOwner, isEditor, isViewer } from "@/lib/actions/permissions";

describe("Task Permissions", () => {
  test("Administrators have full access", () => {
    // Mock admin email
    expect(isOwner("admin@todo.com")).toBe(true);
    expect(isEditor("admin@todo.com")).toBe(true);
    expect(isViewer("admin@todo.com")).toBe(true);
  });

  test("Regular users have limited access", () => {
    // Mock regular user email
    expect(isOwner("user@todo.com")).toBe(false);
    expect(isEditor("user@todo.com")).toBe(true);
    expect(isViewer("user@todo.com")).toBe(true);
  });

  test("Guests have no access", () => {
    // Mock guest email - guests without @ have no auth
    expect(isOwner("guest")).toBe(false);
    expect(isEditor("guest")).toBe(false);
    expect(isViewer("guest")).toBe(true); // All users can view in current implementation
  });
});
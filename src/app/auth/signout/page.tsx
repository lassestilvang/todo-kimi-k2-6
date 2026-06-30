"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignOutPage() {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Out</CardTitle>
          <CardDescription>
            You will be signed out and redirected to the login page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
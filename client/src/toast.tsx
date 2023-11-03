import * as Mtn from "@mantine/notifications";
import * as React from "react";

const severity_values = ["error", "info"] as const;
type TSeverity = (typeof severity_values)[number];

export const component = <Mtn.Notifications />;
export const add = (
  severity: TSeverity,
  text: string,
  duration: number = 50000,
) => {
  Mtn.notifications.show({
    title: text,
    message: "",
    color: severity === "error" ? "red" : "blue",
    autoClose: 0 < duration && duration,
  });
};

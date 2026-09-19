// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "cart.fill": "shopping-cart",
  "chart.bar.fill": "bar-chart",
  "doc.text.fill": "description",
  "person.2.fill": "people",
  "plus": "add",
  "xmark": "close",
  "magnifyingglass": "search",
  "person.badge.plus": "person-add",
  "shippingbox.fill": "inventory-2",
  "ellipsis": "more-horiz",
  "exclamationmark.triangle.fill": "warning",
  "plus.circle.fill": "add-circle",
  "pencil": "edit",
  "trash": "delete-outline",
  "square.and.arrow.up": "share",
  "printer.fill": "print",
  "gearshape.fill": "settings",
  "clock.arrow.circlepath": "history",
  "creditcard.fill": "credit-card",
  "arrow.down.circle.fill": "arrow-downward",
  "arrow.up.circle.fill": "arrow-upward",
  "checkmark.circle.fill": "check-circle",
} as IconMapping;

export function IconSymbol({ name, size = 24, color, style }: { name: IconSymbolName; size?: number; color: string | OpaqueColorValue; style?: StyleProp<TextStyle>; weight?: SymbolWeight; }) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

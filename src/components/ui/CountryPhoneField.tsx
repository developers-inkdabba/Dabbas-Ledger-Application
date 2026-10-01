import { Check, ChevronDown, Phone, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Text, TextInput, TextInputProps, View } from "react-native";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";
import { useThemeColors } from "../../hooks/useTheme";
import { composeInternationalPhone, CountryDialCode, countryDialCodes, defaultCountry, findCountryForPhone, nationalNumberFromPhone } from "../../utils/phone";
import { AdaptiveSheet } from "../shared/AdaptiveSheet";
import { MotionPressable } from "../shared/Motion";
import { FieldSurface } from "./FieldSurface";

type Props = Omit<TextInputProps, "value" | "onChangeText" | "keyboardType"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  hint?: string;
};

export const CountryPhoneField = React.forwardRef<TextInput, Props>(
  ({ label, value, onChangeText, error, hint, onBlur, onFocus, ...props }, ref) => {
    const c = useThemeColors();
  const { height, compact } = useResponsiveLayout();
    const [countryId, setCountryId] = useState(findCountryForPhone(value).id);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);
    const country = countryDialCodes.find((item) => item.id === countryId) || defaultCountry;
    const nationalNumber = nationalNumberFromPhone(value, country);

    useEffect(() => {
      if (!value || value.startsWith(country.dialCode)) return;
      setCountryId(findCountryForPhone(value).id);
    }, [country.dialCode, value]);

    const filteredCountries = useMemo(() => {
      const term = query.trim().toLowerCase();
      if (!term) return countryDialCodes;
      return countryDialCodes.filter((item) =>
        [item.name, item.iso, item.dialCode].some((part) => part.toLowerCase().includes(term))
      );
    }, [query]);

    const selectCountry = (nextCountry: CountryDialCode) => {
      setCountryId(nextCountry.id);
      setPickerOpen(false);
      setQuery("");
      onChangeText(composeInternationalPhone(nextCountry, nationalNumber));
    };

    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ marginBottom: 8, paddingHorizontal: 4, fontSize: 13, fontWeight: "600", color: focused ? c.primary : c.textSoft }}>{label}</Text>
        <FieldSurface focused={focused} invalid={Boolean(error)} style={{ minHeight: 58, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
          <MotionPressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose country code"
            style={{
              minHeight: 44, width: compact ? 100 : 126, flexDirection: "row",
              alignItems: "center", gap: 8, borderRadius: 12,
              backgroundColor: c.surfaceMuted, paddingHorizontal: 8
            }}
          >
            <View style={{
              width: 31, height: 31, alignItems: "center", justifyContent: "center",
              borderRadius: 10, backgroundColor: c.primarySoft
            }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: c.primary }}>{country.iso}</Text>
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.text }}>{country.dialCode}</Text>
              {compact ? null : <Text style={{ marginTop: -1, fontSize: 10, fontWeight: "600", color: c.muted }} numberOfLines={1}>{country.name}</Text>}
            </View>
            <ChevronDown color={c.muted} size={16} />
          </MotionPressable>
          <View style={{ width: 1, height: 30, marginHorizontal: 10, backgroundColor: c.divider }} />
          <Phone color={c.muted} size={17} />
          <TextInput
            ref={ref}
            value={nationalNumber}
            onChangeText={(text) => onChangeText(composeInternationalPhone(country, text))}
            keyboardType="phone-pad"
            placeholder={country.example}
            placeholderTextColor={c.muted}
            selectionColor={c.primary}
            autoCorrect={false}
            onFocus={(event) => { setFocused(true); onFocus?.(event); }}
            onBlur={(event) => { setFocused(false); onBlur?.(event); }}
            style={{ minWidth: 0, flex: 1, height: 56, paddingVertical: 0, paddingLeft: 8, fontSize: 16, fontWeight: "500", color: c.text }}
            {...props}
          />
        </FieldSurface>
        {error ? <Text style={{ marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontWeight: "600", color: c.error }}>{error}</Text> : null}
        {hint && !error ? <Text style={{ marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontWeight: "500", color: c.muted }}>{hint}</Text> : null}

        <AdaptiveSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} scroll={false}>
          <View style={{ height: height * 0.75, padding: 20 }}>
            <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: c.text }}>Country code</Text>
                <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "500", color: c.muted }}>Choose the phone prefix for this user</Text>
              </View>
              <MotionPressable hitSlop={4} onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Close country picker" pressScale={0.9} style={{
                width: 36, height: 36, alignItems: "center", justifyContent: "center",
                borderRadius: 14, backgroundColor: c.surfaceMuted
              }}>
                <X color={c.text} size={18} />
              </MotionPressable>
            </View>
            <View style={{
              marginTop: 18, minHeight: 48, flexDirection: "row", alignItems: "center",
              borderRadius: 10, backgroundColor: c.surfaceMuted, paddingHorizontal: 16
            }}>
              <Search color={c.muted} size={17} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search country or code"
                placeholderTextColor={c.muted}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={c.primary}
                style={{ minWidth: 0, flex: 1, height: 50, paddingVertical: 0, paddingLeft: 10, fontSize: 15, color: c.text }}
              />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
              renderItem={({ item }) => {
                const selected = item.id === country.id;
                return (
                  <MotionPressable accessibilityRole="button"
                    onPress={() => selectCountry(item)}
                    haptic
                    pressScale={0.98}
                    style={{
                      minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12,
                      borderRadius: 14, paddingHorizontal: 12, marginBottom: 6,
                      backgroundColor: selected ? c.primarySoft : "transparent"
                    }}
                  >
                    <View style={{
                      width: 40, height: 40, alignItems: "center", justifyContent: "center",
                      borderRadius: 13, backgroundColor: selected ? c.surface : c.surfaceMuted
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: selected ? c.primary : c.textSoft }}>{item.iso}</Text>
                    </View>
                    <View style={{ minWidth: 0, flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: c.text }}>{item.name}</Text>
                      <Text style={{ marginTop: 2, fontSize: 12, fontWeight: "500", color: c.muted }}>{item.dialCode} - {item.example}</Text>
                    </View>
                    {selected ? <Check color={c.primary} size={18} strokeWidth={3} /> : null}
                  </MotionPressable>
                );
              }}
            />
          </View>
        </AdaptiveSheet>
      </View>
    );
  }
);

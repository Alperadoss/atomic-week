import React from "react";
import { Image, StyleSheet, View } from "react-native";

interface LogoProps {
  size?: "small" | "medium" | "large";
  style?: any;
}

export default function Logo({ size = "medium", style }: LogoProps) {
  const getLogoSource = () => {
    switch (size) {
      case "small":
        return require("@/assets/images/logo-small.png");
      case "large":
        return require("@/assets/images/logo-large.png");
      default:
        return require("@/assets/images/logo.png");
    }
  };

  const getLogoStyle = () => {
    switch (size) {
      case "small":
        return styles.logoSmall;
      case "large":
        return styles.logoLarge;
      default:
        return styles.logoMedium;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={getLogoSource()}
        style={getLogoStyle()}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoSmall: {
    width: 120,
    height: 40,
  },
  logoMedium: {
    width: 200,
    height: 80,
  },
  logoLarge: {
    width: 300,
    height: 120,
  },
});

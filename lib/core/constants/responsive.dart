import 'dart:math' as math;

import 'package:flutter/widgets.dart';

class ResponsiveBreakpoints {
  static const double mobile = 600;
  static const double tablet = 1024;
  static const double contentMaxWidth = 1200;
}

class Responsive {
  static bool isMobile(BuildContext context) {
    return MediaQuery.sizeOf(context).width < ResponsiveBreakpoints.mobile;
  }

  static bool isTablet(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return width >= ResponsiveBreakpoints.mobile &&
        width < ResponsiveBreakpoints.tablet;
  }

  static bool isDesktop(BuildContext context) {
    return MediaQuery.sizeOf(context).width >= ResponsiveBreakpoints.tablet;
  }

  static EdgeInsets pagePadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;

    if (width >= ResponsiveBreakpoints.tablet) {
      return const EdgeInsets.symmetric(horizontal: 24, vertical: 16);
    }

    if (width >= ResponsiveBreakpoints.mobile) {
      return const EdgeInsets.symmetric(horizontal: 20, vertical: 16);
    }

    return const EdgeInsets.all(16);
  }

  static double metricCardWidth(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;

    if (width >= ResponsiveBreakpoints.tablet) {
      return 240;
    }

    if (width >= ResponsiveBreakpoints.mobile) {
      final available = width - 64;
      return math.max(180, math.min(available / 2, 240));
    }

    return 170;
  }
}

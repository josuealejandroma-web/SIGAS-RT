#include "system_types.h"

namespace sigas {

const char *toString(ZoneLevel level) {
  switch (level) {
    case ZoneLevel::kNormal:
      return "NORMAL";
    case ZoneLevel::kWarning:
      return "WARNING";
    case ZoneLevel::kHigh:
      return "HIGH";
  }
  return "UNKNOWN";
}

const char *toString(RequestedAction action) {
  switch (action) {
    case RequestedAction::kNormal:
      return "NORMAL";
    case RequestedAction::kWarning:
      return "WARNING";
    case RequestedAction::kSafeClose:
      return "SAFE_CLOSE";
  }
  return "UNKNOWN";
}

}  // namespace sigas

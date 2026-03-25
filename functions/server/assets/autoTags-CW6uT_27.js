function formatPriceTag(price) {
  if (!price || price === "" || isNaN(Number(price))) return null;
  const numPrice = Number(price);
  if (numPrice < 1e3) return null;
  if (numPrice >= 1e6) {
    const millions = numPrice / 1e6;
    if (millions % 1 === 0) {
      return `${millions} ล้าน`;
    } else {
      return `${millions.toFixed(1)} ล้าน`;
    }
  }
  if (numPrice >= 1e3) {
    const thousands = numPrice / 1e3;
    if (thousands % 1 === 0) {
      return `${thousands} พัน`;
    } else {
      return `${thousands.toFixed(1)} พัน`;
    }
  }
  return null;
}
function formatListingTypeTag(listingType) {
  if (!listingType) return null;
  switch (listingType) {
    case "sale":
      return "ขาย";
    case "rent":
      return "เช่า";
    default:
      return null;
  }
}
function formatAvailabilityTag(availability) {
  if (!availability) return null;
  switch (availability) {
    case "available":
    case "ว่าง":
      return "ว่าง";
    case "reserved":
    case "ติดจอง":
      return "ติดจอง";
    case "sold":
    case "ขายแล้ว":
      return "ขายแล้ว";
    case "unavailable":
    case "ไม่ว่าง":
      return "ไม่ว่าง";
    default:
      return null;
  }
}
function generateAutoTags(property) {
  try {
    if (!property || typeof property !== "object") {
      return [];
    }
    const tags = [];
    if (property.propertyId && typeof property.propertyId === "string") {
      const cleanId = property.propertyId.trim();
      if (cleanId) {
        tags.push(cleanId);
      }
    }
    if (property.type && typeof property.type === "string") {
      const cleanType = property.type.trim();
      if (cleanType) {
        tags.push(cleanType);
      }
    }
    if (property.locationDisplay && typeof property.locationDisplay === "string") {
      const cleanLocation = property.locationDisplay.trim();
      if (cleanLocation) {
        tags.push(cleanLocation);
      }
    }
    if (Array.isArray(property.nearbyPlace) && property.nearbyPlace.length > 0) {
      property.nearbyPlace.forEach((place) => {
        if (place && typeof place === "string") {
          const cleanPlace = place.trim();
          if (cleanPlace) {
            tags.push(cleanPlace);
          }
        } else if (place && typeof place === "object") {
          const placeLabel = place.label || place.name || place.value || "";
          if (placeLabel && typeof placeLabel === "string") {
            const cleanPlace = placeLabel.trim();
            if (cleanPlace) {
              tags.push(cleanPlace);
            }
          }
        }
      });
    }
    const listingTypeTag = formatListingTypeTag(property.listingType);
    if (listingTypeTag) {
      tags.push(listingTypeTag);
    }
    if (property.subListingType === "installment_only") {
      tags.push("ผ่อนตรง");
    } else if (property.subListingType === "rent_only") {
    }
    if (property.directInstallment === true && !tags.includes("ผ่อนตรง")) {
      tags.push("ผ่อนตรง");
    }
    const availabilityTag = formatAvailabilityTag(property.availability || property.status);
    if (availabilityTag) {
      tags.push(availabilityTag);
    }
    const priceTag = formatPriceTag(property.price);
    if (priceTag) {
      tags.push(priceTag);
    }
    if (property.propertyCondition) {
      const condition = String(property.propertyCondition).trim();
      if (condition === "มือ 1" || condition === "มือ1") {
        tags.push("มือ 1");
      } else if (condition === "มือ 2" || condition === "มือ2") {
        tags.push("มือ 2");
      }
    }
    if (!property.propertyCondition && property.propertySubStatus) {
      const subStatus = String(property.propertySubStatus).trim();
      if (subStatus === "มือ 1" || subStatus === "มือ1") {
        tags.push("มือ 1");
      } else if (subStatus === "มือ 2" || subStatus === "มือ2") {
        tags.push("มือ 2");
      }
    }
    return tags.filter((tag) => tag && typeof tag === "string" && tag.trim().length > 0);
  } catch (error) {
    console.error("generateAutoTags error:", error);
    return [];
  }
}
function mergeTags(customTags = [], autoTags = []) {
  try {
    const allTags = [...Array.isArray(customTags) ? customTags : [], ...Array.isArray(autoTags) ? autoTags : []];
    const uniqueTags = /* @__PURE__ */ new Set();
    const normalizedTags = /* @__PURE__ */ new Set();
    allTags.forEach((tag) => {
      if (!tag || typeof tag !== "string") return;
      const trimmedTag = tag.trim();
      if (!trimmedTag) return;
      const normalized = trimmedTag.toLowerCase().replace(/\s+/g, " ");
      if (!normalizedTags.has(normalized)) {
        normalizedTags.add(normalized);
        uniqueTags.add(trimmedTag);
      }
    });
    return Array.from(uniqueTags);
  } catch (error) {
    console.error("mergeTags error:", error);
    return Array.isArray(customTags) ? customTags : [];
  }
}
export {
  generateAutoTags as g,
  mergeTags as m
};

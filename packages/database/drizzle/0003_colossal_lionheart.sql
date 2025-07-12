ALTER TABLE "users" ADD COLUMN "settings" json;

-- Populate settings JSON with existing locale data and default values
UPDATE "users" SET "settings" = jsonb_build_object(
  'locale', "locale",
  'audio', true,
  'volume', 50,
  'chatVisibility', true,
  'chatNotificationSize', 'normal',
  'switchToPlayerWhoIsPlaying', true,
  'showPreviewOpponentsCardsForMobile', true,
  'gameBoardSize', 'normal',
  'enlargeActivePlayerBoard', false,
  'timerDisplayMode', 'smart'
) WHERE "settings" IS NULL;
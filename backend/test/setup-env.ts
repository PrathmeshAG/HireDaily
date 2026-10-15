// Imported FIRST by tests that go through the production DM / reply code, so the
// config module (read once at import time) sees a test Instagram account id.
// These are fake values; nothing here ever reaches Meta.
process.env.INSTAGRAM_BUSINESS_ID ??= "ig_123";

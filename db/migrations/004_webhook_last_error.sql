-- Why the latest delivery attempt failed, so a developer can fix it from the console.
ALTER TABLE webhook_delivery ADD COLUMN last_error text;

-- Allow REJECTED bounty status and event (client rejected submitted work; funds refunded)
alter table bounties drop constraint if exists bounties_status_check;
alter table bounties add constraint bounties_status_check
  check (status in ('OPEN','ACCEPTED','SUBMITTED','APPROVED','RELEASED','REFUNDED','REJECTED'));

alter table escrow_events drop constraint if exists escrow_events_event_type_check;
alter table escrow_events add constraint escrow_events_event_type_check
  check (event_type in ('DEPOSIT','ACCEPTED','SUBMITTED','APPROVED','RELEASED','REFUNDED','REJECTED'));

alter table transactions 
add column if not exists courtcollectiondata jsonb default null;

comment on column transactions.courtcollectiondata is 'Data related to court collection process';

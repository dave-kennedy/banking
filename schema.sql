begin;

create table if not exists categories (
    id int not null auto_increment,
    name varchar(255) not null,
    primary key (id)
    unique key (name)
);

create table if not exists keywords (
    id int not null auto_increment,
    category_id int not null,
    name varchar(255) not null,
    primary key (id),
    foreign key (category_id) references categories (id),
    unique key (name)
);

create table if not exists transactions (
    id int not null auto_increment,
    date date not null,
    description varchar(255) not null,
    `check` int null,
    debit numeric(15, 2) null,
    credit numeric(15, 2) null,
    primary key (id)
);

commit;


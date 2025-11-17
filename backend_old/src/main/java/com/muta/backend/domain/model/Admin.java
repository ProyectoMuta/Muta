package com.muta.backend.domain.model;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

@Entity
@DiscriminatorValue("ADMIN")
public class Admin extends User {
    // Al igual que Client, esta clase puede tener en el futuro
    // campos específicos para los administradores, como niveles de permiso.
}

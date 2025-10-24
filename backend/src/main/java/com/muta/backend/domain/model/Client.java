package com.muta.backend.domain.model;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

@Entity
@DiscriminatorValue("CLIENT")
public class Client extends User {
    // Por ahora, esta clase no necesita campos adicionales.
    // En el futuro, se podrían añadir aquí propiedades específicas
    // para los clientes, como puntos de fidelidad, etc.
}
